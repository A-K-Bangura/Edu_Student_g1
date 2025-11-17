import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { CourseCard } from "../components/course/CourseCard";
import { Search, Filter, BookOpen, X } from "lucide-react";
import { getCourses } from "../services/courses";
import { getCurrentUser } from "../services/auth";
import type { CourseFilters } from "../types/course";

export const Courses = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Get current user to set default filters
  const currentUser = getCurrentUser();
  const defaultLevel =
    (currentUser as any)?.year_of_study || (currentUser as any)?.level;
  const defaultDepartmentId = currentUser?.department?.id;
  const defaultFacultyId = currentUser?.faculty?.id;
  const defaultUniversityId = currentUser?.university?.id;

  const [showAllCourses, setShowAllCourses] = useState(false);
  const [activeGroup, setActiveGroup] = useState<
    "department" | "faculty" | "university" | "all" | null
  >(null);
  const [groupMode, setGroupMode] = useState<
    "department" | "faculty" | "university" | "all" | null
  >(null);
  const [filters, setFilters] = useState<CourseFilters>({
    page: 1,
    per_page: 20,
    level: defaultLevel,
    department_id: defaultDepartmentId,
    faculty_id: defaultFacultyId,
    university_id: defaultUniversityId,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize from ?group= query param
  useEffect(() => {
    const group = searchParams.get("group") as
      | "department"
      | "faculty"
      | "university"
      | "all"
      | null;
    if (!group) {
      setGroupMode(null);
      return;
    }

    setGroupMode(group);
    setShowAllCourses(true);
    setActiveGroup(group);
    if (group === "department") {
      setFilters({
        page: 1,
        per_page: 20,
        level: defaultLevel,
        department_id: defaultDepartmentId,
      });
    } else if (group === "faculty") {
      setFilters({
        page: 1,
        per_page: 20,
        level: defaultLevel,
        faculty_id: defaultFacultyId,
      });
    } else if (group === "university") {
      setFilters({
        page: 1,
        per_page: 20,
        level: defaultLevel,
        university_id: defaultUniversityId,
      });
    } else {
      // all
      setFilters({
        page: 1,
        per_page: 20,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ["courses", filters],
    queryFn: () => getCourses(filters),
  });

  // Grouped recommended queries (top 6 each)
  const { data: departmentCourses } = useQuery({
    queryKey: [
      "courses",
      "group",
      "department",
      defaultDepartmentId,
      defaultLevel,
    ],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
        level: defaultLevel,
        department_id: defaultDepartmentId,
      }),
    enabled: !!defaultDepartmentId,
  });

  const { data: facultyCourses } = useQuery({
    queryKey: ["courses", "group", "faculty", defaultFacultyId, defaultLevel],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
        level: defaultLevel,
        faculty_id: defaultFacultyId,
      }),
    enabled: !!defaultFacultyId,
  });

  const { data: universityCourses } = useQuery({
    queryKey: [
      "courses",
      "group",
      "university",
      defaultUniversityId,
      defaultLevel,
    ],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
        level: defaultLevel,
        university_id: defaultUniversityId,
      }),
    enabled: !!defaultUniversityId,
  });

  // Explore all (no organization filters). Keep level out as requested
  const { data: exploreAllCourses } = useQuery({
    queryKey: ["courses", "group", "all"],
    queryFn: () =>
      getCourses({
        page: 1,
        per_page: 6,
      }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      search: searchQuery || undefined,
      page: 1,
    }));
  };

  const handleFilterChange = (
    key: keyof CourseFilters,
    value: string | number | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  };

  const handleShowAll = () => {
    setShowAllCourses(true);
    setActiveGroup("all");
    setFilters({
      page: 1,
      per_page: 20,
      // Remove department, faculty, university filters but keep level
      level: defaultLevel,
    });
  };

  const handleResetFilters = () => {
    setShowAllCourses(false);
    setActiveGroup(null);
    setFilters({
      page: 1,
      per_page: 20,
      level: defaultLevel,
      department_id: defaultDepartmentId,
      faculty_id: defaultFacultyId,
      university_id: defaultUniversityId,
    });
  };

  const courses = coursesData?.data || [];
  const departmentList = departmentCourses?.data || [];
  const facultyList = facultyCourses?.data || [];
  const universityList = universityCourses?.data || [];
  const exploreList = exploreAllCourses?.data || [];

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Browse Courses
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {showAllCourses
                  ? "Explore all available courses"
                  : "Discover courses tailored to your field of study"}
              </p>
            </div>
            {!showAllCourses && (
              <button
                onClick={handleShowAll}
                className="px-4 py-2 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                Explore All
              </button>
            )}
            {showAllCourses && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 border border-gray-200 dark:border-gray-700">
          {/* Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-azure-500 hover:bg-azure-600 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Level
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filters.level || ""}
                  onChange={(e) => handleFilterChange("level", e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                >
                  <option value="">All Levels</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filters.sort_by || "created_at"}
                  onChange={(e) =>
                    handleFilterChange(
                      "sort_by",
                      e.target.value as "created_at" | "title"
                    )
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                >
                  <option value="created_at">Date Created</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filters.sort_order || "desc"}
                  onChange={(e) =>
                    handleFilterChange(
                      "sort_order",
                      e.target.value as "asc" | "desc"
                    )
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-azure-500"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-courses view title when group is active */}
        {groupMode && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {groupMode === "department" && "Department Courses"}
                {groupMode === "faculty" && "Faculty Courses"}
                {groupMode === "university" && "University Courses"}
                {groupMode === "all" && "All Courses"}
              </h2>
              <button
                onClick={() => {
                  setSearchParams({});
                  setGroupMode(null);
                  handleResetFilters();
                }}
                className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
              >
                Back to recommendations
              </button>
            </div>
          </div>
        )}

        {/* Recommended by Department */}
        {!groupMode && departmentList.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recommended in Your Department
              </h2>
              <button
                onClick={() => {
                  navigate({
                    pathname: "/courses",
                    search: "?group=department",
                  });
                }}
                className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departmentList.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  source="dept-recommended"
                />
              ))}
            </div>
          </div>
        )}

        {/* Recommended by Faculty */}
        {!groupMode && facultyList.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recommended in Your Faculty
              </h2>
              <button
                onClick={() => {
                  navigate({ pathname: "/courses", search: "?group=faculty" });
                }}
                className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facultyList.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  source="faculty-recommended"
                />
              ))}
            </div>
          </div>
        )}

        {/* Recommended by University */}
        {!groupMode && universityList.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recommended in Your University
              </h2>
              <button
                onClick={() => {
                  navigate({
                    pathname: "/courses",
                    search: "?group=university",
                  });
                }}
                className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {universityList.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  source="university-recommended"
                />
              ))}
            </div>
          </div>
        )}

        {/* Explore All (Unfiltered) */}
        {!groupMode && exploreList.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Explore All
              </h2>
              <button
                onClick={() => {
                  navigate({ pathname: "/courses", search: "?group=all" });
                }}
                className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exploreList.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  source="explore-all"
                />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse"
              >
                <div className="h-40 bg-gray-200 dark:bg-gray-700" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  source="courses-list"
                />
              ))}
            </div>

            {/* Pagination */}
            {coursesData?.meta && coursesData.meta.last_page > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.max(1, (prev.page || 1) - 1),
                    }))
                  }
                  disabled={coursesData.meta?.current_page === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <div className="px-4 py-2 bg-azure-500 text-white rounded-lg">
                  {coursesData.meta?.current_page} /{" "}
                  {coursesData.meta?.last_page}
                </div>
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(
                        coursesData.meta?.last_page || 1,
                        (prev.page || 1) + 1
                      ),
                    }))
                  }
                  disabled={
                    coursesData.meta?.current_page ===
                    coursesData.meta?.last_page
                  }
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No courses found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
};
